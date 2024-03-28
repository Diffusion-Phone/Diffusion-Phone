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
             index_url="https://download.pytorch.org/whl/nightly/cu111", 
             pre=True,
             )
             )


with image.imports():
    import io
    
    from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler, UNet2DConditionModel
    import torch
    from safetensors.torch import load_file
    from huggingface_hub import hf_hub_download
    
    from fastapi import Response


base = "stabilityai/stable-diffusion-xl-base-1.0"
repo = "ByteDance/SDXL-Lightning"
ckpt = "sdxl_lightning_4step_unet.safetensors"

@stub.cls(
    image=image, 
    gpu="a10g",
    container_idle_timeout=240,

    )


class Model:
    @modal.build()
    @modal.enter()
    def enter(self):
        
        # Ignore FutureWarning regarding `from_config` method
        unet = UNet2DConditionModel.from_config(base, subfolder="unet").to("cuda", torch.bfloat16)
        unet.load_state_dict(load_file(hf_hub_download(repo, ckpt), device="cuda"))

        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            base, 
            unet=unet, 
            torch_dtype=torch.bfloat16
            ).to("cuda")

        self.pipe.scheduler = EulerDiscreteScheduler.from_config(
            self.pipe.scheduler.config, 
            timestep_spacing="trailing"
            )

        # Configure Compiler Flags
        torch._inductor.config.conv_1x1_as_mm = True
        torch._inductor.config.coordinate_descent_tuning = True
        torch._inductor.config.epilogue_fusion = False
        torch._inductor.config.coordinate_descent_check_all_directions = True

        # Change Memory Layout
        self.pipe.unet.to(memory_format=torch.channels_last)
        self.pipe.vae.to(memory_format=torch.channels_last)

        # Compile UNet
        # self.pipe.unet = torch.compile(self.pipe.unet, mode="reduce-overhead", fullgraph=True)
        # self.pipe.vae.decode = torch.compile(self.pipe.vae.decode, mode="reduce-overhead", fullgraph=True)
        # self.pipe.upcast_vae()

        # Blank Inference
        self.pipe(prompt="A", num_inference_steps=1)


    def _inference(self, prompt, n_steps=4):
        generated_image = self.pipe(
            prompt=prompt,
            num_inference_steps=n_steps,
        ).images[0]

        byte_stream = io.BytesIO()
        generated_image.save(byte_stream, format="JPEG")

        return byte_stream


    @modal.method()
    def inference(self, prompt, n_steps=8):
        return self._inference(prompt, n_steps=n_steps).getvalue()


    @modal.web_endpoint(method="POST")
    async def web_inference(self, prompt, n_steps=8):
        return Response(
            content=self._inference(prompt, n_steps=n_steps).getvalue(),
            media_type="image/jpeg",
        )


# For CLI Testing
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
    allow_concurrent_inputs=20,
)
@modal.asgi_app()
def app():
    import fastapi.staticfiles
    from fastapi import FastAPI
    from jinja2 import Template

    web_app = FastAPI()

    with open("/assets/index.html", "r") as f:
        template_html = f.read()

    template = Template(template_html)

    with open("/assets/index.html", "w") as f:
        html = template.render(
            inference_url=Model.web_inference.web_url,
            model_name="PixeLana-SD",
            default_prompt="A Chinese and Filipino fusion dish with a Solana NFT in the background",
        )
        f.write(html)

    web_app.mount("/", fastapi.staticfiles.StaticFiles(directory="/assets", html=True))

    return web_app



# https://rizzwareengineer--stable-diffusion-xl-lightning-model-we-190957.modal.run