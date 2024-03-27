import io
from pathlib import Path

from modal import (
    Image,
    Mount,
    Stub,
    asgi_app,
    build,
    enter,
    gpu,
    method,
    web_endpoint,
)

sdxl_turbo_image = (
    Image.debian_slim(python_version="3.10")
    .apt_install(
        "libglib2.0-0", "libsm6", "libxrender1", "libxext6", "ffmpeg", "libgl1"
    )


    # !pip install -q -U diffusers transformers accelerate peft
    # !pip install -q --pre torch --index-url https://download.pytorch.org/whl/nightly/cu121
    .pip_install(
        "diffusers==0.26.3",
        "transformers~=4.38.2",
        "accelerate==0.27.2",
        "peft==0.10.0",
        
        "invisible_watermark==0.2.0",
        "safetensors==0.4.2",
    )

)

stub = Stub("stable-diffusion-xl-turbo")

with sdxl_turbo_image.imports():
    import torch
    from diffusers import DiffusionPipeline
    from fastapi import Response
    from huggingface_hub import snapshot_download


@stub.cls(gpu=gpu.A10G(), container_idle_timeout=240, image=sdxl_turbo_image)
class Model:
    # Download the model weights
    @build()
    def download_models(self):
        # Ignore files that we don't need to speed up download time
        ignore = [
            "*.bin",
            "*.onnx_data",
            "*/diffusion_pytorch_model.safetensors",
        ]

        snapshot_download("stabilityai/sdxl-turbo", ignore_patterns=ignore)


    # Load the model into memory
    @enter()
    def enter(self):
        self.pipeline = DiffusionPipeline.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.bfloat16).to("cuda")


    # 
    def _inference(self, user_prompt: str = "Solana", num_inference_steps: int = 4):
        if num_inference_steps > 10: num_inference_steps = 10
        
        generated_image = self.pipeline(
            prompt = user_prompt,
            num_inference_steps=num_inference_steps,
            generator=torch.manual_seed(0)
        ).images[0]

        byte_stream = io.BytesIO()
        generated_image.save(byte_stream, format="PNG")

        return byte_stream
    

    #
    @method()
    def inference(self, user_prompt: str, num_inference_steps: int):
        return self._inference(user_prompt, num_inference_steps).getvalue()

    
    @web_endpoint()
    def web_inference(self, user_prompt: str = "Solana Logo", num_inference_steps: int = 4):
        if num_inference_steps > 10: num_inference_steps = 10
        
        return Response(content=self._inference(user_prompt, num_inference_steps).getvalue(), media_type="image/png")
    


@stub.local_entrypoint()
def main(user_prompt: str = "Solana", num_inference_steps: int = 4):
    image_bytes = Model().inference.remote(user_prompt, num_inference_steps)

    dir = Path("/tmp/stable-diffusion-xl-turbo")
    if not dir.exists(): dir.mkdir(exist_ok=True, parents=True)

    output_path = dir / "output.png"
    print(f"Saving it to {output_path}")
    with open(output_path, "wb") as f:
        f.write(image_bytes)


frontend_path = Path(__file__).parent / "test-modal"
web_image = Image.debian_slim().pip_install("jinja2")


@stub.function(
    image=web_image,
    mounts=[Mount.from_local_dir(frontend_path, remote_path="/assets")],
    allow_concurrent_inputs=20,
)
@asgi_app()
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
            model_name="Stable Diffusion XL Turbo",
            default_prompt="A cinematic shot of a baby raccoon wearing an intricate italian priest robe.",
        )
        f.write(html)

    web_app.mount(
        "/", fastapi.staticfiles.StaticFiles(directory="/assets", html=True)
    )

    return web_app


