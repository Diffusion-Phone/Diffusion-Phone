import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.NEXT_PUBLIC_AWS_S3_REGION || '',
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY || '',
    },
});
    

async function uploadFileToS3(buffer: Buffer, fileName: string) {
    const fileBuffer = buffer;
    console.log(fileName);

    const params = {
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || '',
        Key: fileName,
        Body: fileBuffer,
    };
}


export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" });
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = await uploadFileToS3(buffer, file.name);


        return NextResponse.json({ success: true, fileName });
    } catch (error) {
        return NextResponse.json({ error: "Failed to upload file" });
    }
}



export async function GET(req: Request) {
  return NextResponse.json({ message: "Hello from the API!" });
}