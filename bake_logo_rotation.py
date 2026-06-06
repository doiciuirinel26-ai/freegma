"""
Re-export freegma_logo_neon.glb cu rotatia corecta pentru model-viewer:
  - text orizontal (axa X in GLTF)
  - fata spre -Z (camera default model-viewer)
Rotatii in Blender:
  1. -90 in jurul Z  →  fata: -X → +Y (= GLTF -Z)
  2. +90 in jurul Y  →  text:  Z → X  (= GLTF X, orizontal)
"""
import bpy, math

INPUT  = r"C:\Users\Fane sefu meu\Downloads\freegma_logo_neon.glb"
OUTPUT = r"C:\Users\Fane sefu meu\Desktop\FREEGMA\public\freegma_logo.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=INPUT)

bpy.ops.object.select_all(action='SELECT')
# Rotatii calculate pentru GLTF/model-viewer:
#   text (Z) → +X  (orizontal, stanga-dreapta)
#   tops (-Y) → +Z  (Blender Z = GLTF Y = sus)
#   fata (-X) → +Y  (Blender Y = GLTF -Z = spre camera)
bpy.ops.transform.rotate(value=math.radians(90),  orient_axis='Y')
bpy.ops.transform.rotate(value=math.radians(-90), orient_axis='X')
bpy.ops.object.transform_apply(rotation=True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format='GLB',
    export_lights=True,
    export_apply=True,
)
print(f"DONE: {OUTPUT}")
