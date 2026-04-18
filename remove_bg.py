from rembg import remove
from PIL import Image

def process(input_file):
    try:
        print(f"Processing {input_file}...")
        input_image = Image.open(input_file)
        # Using rembg to accurately knockout anything that isn't the subject
        output_image = remove(input_image)
        output_image.save(input_file)
        print(f"Success for {input_file}")
    except Exception as e:
        print(f"Error processing {input_file}: {e}")

if __name__ == "__main__":
    process('3d-puppy.png')
    process('3d-dog.png')
