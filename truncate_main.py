
# Script to truncate backend/main.py after the Health Check endpoint
import os

file_path = r"c:\Users\lpraf\Documents\Desarrollos\Poliverso\sist_base\backend\main.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the start of Section 14
cut_index = -1
for i, line in enumerate(lines):
    if "# 14. ENDPOINTS DE EXPORTACIÓN" in line:
        # The header usually starts heavily with ===, so we look for the line before it
        # Step 177 showed:
        # 772: # ============================================
        # 773: # 14. ENDPOINTS DE EXPORTACIÓN
        # So we want to cut at line 772 (element i-1)
        cut_index = i - 1
        break

if cut_index != -1:
    print(f"Found cut point at line {cut_index + 1}")
    new_lines = lines[:cut_index]
    
    # Verify we are not cutting too much
    print("Last 5 lines to be kept:")
    for l in new_lines[-5:]:
        print(l.rstrip())
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("File truncated successfully.")
else:
    print("Could not find '# 14. ENDPOINTS DE EXPORTACIÓN'")
