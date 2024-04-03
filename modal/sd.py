from pathlib import Path
import modal
from modal import Image


stub = modal.Stub("pixelana-sd")

pip_packages = [
    "diffusers==0.26.3",
    "transformers~=4.37.2",
    "accelerate==0.27.2",
    "peft==0.10.0",
]

image = (Image.debian_slim(python_version="3.11")
         .pip_install(*pip_packages)
         .pip_install(
             "torch", 
             index_url="https://download.pytorch.org/whl/nightly/cu121", 
             pre=True,
             )
             )

with image.imports():
    import io
    
    import torch
    from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file
    
    from fastapi import Response

base = "stabilityai/stable-diffusion-xl-base-1.0"
repo = "ByteDance/SDXL-Lightning"
ckpt = "sdxl_lightning_4step_unet.safetensors"

@stub.cls(
    image=image, 
    gpu="a10g",
    container_idle_timeout=240,
    concurrency_limit=10
    )
class Model:
    @modal.build()
    @modal.enter()
    def enter(self):

        # Load UNet
        unet = UNet2DConditionModel.from_config(base, subfolder="unet").to("cuda", torch.bfloat16)
        unet.load_state_dict(load_file(hf_hub_download(repo, ckpt), device="cuda"))
        
        # Load Model
        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            base, 
            unet=unet, 
            torch_dtype=torch.bfloat16, 
            # variant="fp16"
            ).to("cuda")

        # Ensure sampler uses "trailing" timesteps
        self.pipe.scheduler = EulerDiscreteScheduler.from_config(
            self.pipe.scheduler.config, 
            timestep_spacing="trailing"
            )

        # Blank Inference to lazy load objects which occurs upon first inference
        print("Warming up the model...")
        self.pipe(
            "blank",
            num_inference_steps=1,
            guidance_scale=0.0,
        )


    def _inference(self, prompt):
        generated_image = self.pipe(
            prompt,
            num_inference_steps=4,
            guidance_scale=0,
            ).images[0]

        byte_stream = io.BytesIO()
        generated_image.save(byte_stream, format="JPEG")


        return byte_stream


    @modal.method()
    def inference(self, prompt):
        return self._inference(prompt).getvalue()


    @modal.web_endpoint()
    def web_inference(self, prompt):

        return Response(
            content=self._inference(prompt).getvalue(),
            media_type="image/jpeg",
        )


# For CLI Testin
# modal run sd.py --prompt "<prompt>"
@stub.local_entrypoint()
def main(prompt: str):
    image_bytes = Model().inference.remote(prompt)

    dir = Path.cwd() / "generated-images"
    if not dir.exists(): dir.mkdir(exist_ok=True, parents=True)

    output_path = dir / "output.png"
    print(f"Saving it to {output_path}")
    with open(output_path, "wb") as f:
        f.write(image_bytes)


# For Web Testing
frontend_path = Path(__file__).parent / "frontend"
web_image = modal.Image.debian_slim().pip_install("jinja2")
@stub.function(
    image=web_image,
    mounts=[modal.Mount.from_local_dir(frontend_path, remote_path="/assets")],
    allow_concurrent_inputs=10,
)
@modal.asgi_app()
def app():
    import fastapi.staticfiles
    from fastapi import FastAPI
    from jinja2 import Template

    web_app = FastAPI()
    modal = Model()

    # Warm up the model
    modal.enter()

    with open("/assets/index.html", "r") as f: template_html = f.read()
    template = Template(template_html)

    with open("/assets/index.html", "w") as f:
        html = template.render(
            inference_url=modal.web_inference.web_url,
            model_name="PixeLana-SD",
            default_prompt="A Chinese and Filipino fusion dish with a Solana NFT in the background",
        )
        f.write(html)


    web_app.mount("/", fastapi.staticfiles.StaticFiles(directory="/assets", html=True))
    return web_app