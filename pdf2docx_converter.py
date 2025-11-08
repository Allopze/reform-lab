#!/usr/bin/env python3
"""
PDF to DOCX converter using pdf2docx library
Usage: python pdf2docx_converter.py <input_pdf> <output_docx>
"""
import sys
import os
from pdf2docx import Converter

def convert_pdf_to_docx(pdf_path, docx_path):
    """Convert PDF to DOCX using pdf2docx"""
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            sys.exit(1)
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(docx_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        # Convert PDF to DOCX
        cv = Converter(pdf_path)
        cv.convert(docx_path)
        cv.close()
        
        print(f"SUCCESS: Converted {os.path.basename(pdf_path)} -> {os.path.basename(docx_path)}")
        sys.exit(0)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf2docx_converter.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]
    
    convert_pdf_to_docx(input_pdf, output_docx)
