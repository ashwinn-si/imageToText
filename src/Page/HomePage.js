import React, { useEffect, useRef, useState } from "react";
import { FileIcon, Image as ImageIcon, Upload, X } from "lucide-react";

import axios from "axios";

export default function HomePage() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isImage, setIsImage] = useState(false);
    const [extractedText, setExtractedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const API_URL = "https://api.ocr.space/parse/image";
    const API_KEY = "K88367828388957";

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
        }
    };

    // Generate preview URL when file changes
    useEffect(() => {
        if (file) {
            // Check if file is an image
            const fileType = file.type.split('/')[0];
            setIsImage(fileType === 'image');

            if (fileType === 'image') {
                const objectUrl = URL.createObjectURL(file);
                setPreview(objectUrl);

                // Free memory when component unmounts
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreview(null);
            }
        }
    }, [file]);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            setFile(selectedFile);
        }
    };

    const handleRemoveFile = (e) => {
        e.stopPropagation();
        setFile(null);
        setPreview(null);
        setIsImage(false);
        setExtractedText("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };


    async function handleExtractText() {
        if (!file || !(file instanceof Blob)) {
            console.error("Invalid file selected");
            return;
        }

        // Check if file is PNG or JPEG
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            console.error("Unsupported file type. Please upload PNG or JPEG images only.");
            return;
        }

        setIsLoading(true);
        try {
            // Crop the left half of the image
            const croppedFile = await cropLeftHalf(file);

            // Prepare FormData with the cropped image
            const formData = new FormData();
            formData.append("file", croppedFile);
            formData.append("apikey", API_KEY);
            formData.append("language", "eng");
            formData.append("isOverlayRequired", "false");

            // Send request to OCR API
            const response = await axios.post(API_URL, formData);

            // Check if ParsedResults exists and has at least one item
            if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
                const text = response.data.ParsedResults[0].ParsedText || "No text extracted";
                console.log(text);
                setExtractedText(text);
                return text;
            } else {
                console.log("No text extracted");
                setExtractedText("No text extracted");
                return "";
            }
        } catch (error) {
            console.error("Error extracting text:", error);
            setExtractedText("Error extracting text. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    // Function to crop the left half of the image and return it as a File
    async function cropLeftHalf(file) {
        if (!(file instanceof Blob)) {
            throw new Error("Invalid file");
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (event) => {
                img.src = event.target.result;
            };

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Set canvas size to half of the image width
                canvas.width = Math.floor(img.width / 2);
                canvas.height = img.height;

                // Draw only the left half of the image
                ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, canvas.width, canvas.height);

                // Determine the output format based on the input file
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const outputQuality = outputType === 'image/jpeg' ? 0.9 : undefined;

                // Convert canvas to Blob and return as File with original format
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Preserve original extension
                        let fileName;
                        if (file.name) {
                            fileName = `cropped_${file.name}`;
                        } else {
                            // Default filename with appropriate extension
                            const extension = outputType === 'image/png' ? '.png' : '.jpg';
                            fileName = `cropped_image${extension}`;
                        }

                        resolve(new File([blob], fileName, { type: outputType }));
                    } else {
                        reject(new Error("Error creating cropped image"));
                    }
                }, outputType, outputQuality);
            };

            img.onerror = () => reject(new Error("Error loading image"));
            reader.onerror = () => reject(new Error("Error reading file"));

            // Read file as Data URL
            reader.readAsDataURL(file);
        });
    }

    return (
        <div className="bg-gray-200 dark:bg-zinc-900 w-screen min-h-screen transition-colors duration-300 overflow-x-hidden">
            <p className="font-bold text-center pt-3 text-2xl lg:text-3xl text-zinc-900 dark:text-gray-200">Image To Text Converter</p>
            <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto mt-6 px-4">
                {!file ? (
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300
                        ${isDragging
                            ? 'border-zinc-700 bg-zinc-200 dark:border-gray-400 dark:bg-zinc-800'
                            : 'border-zinc-400 dark:border-zinc-700 hover:border-zinc-600 dark:hover:border-zinc-500'
                        }
                        bg-white dark:bg-zinc-800`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            accept="image/*"
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            <Upload className="w-12 h-12 mb-3 text-zinc-500 dark:text-zinc-400" />
                            <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-gray-200">
                                <span className="font-bold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                JPG, PNG
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-colors duration-300">
                        {isImage && preview && (
                            <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}

                        <div className="p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-md">
                                        {isImage ? (
                                            <ImageIcon className="w-6 h-6 text-zinc-700 dark:text-gray-300" />
                                        ) : (
                                            <FileIcon className="w-6 h-6 text-zinc-700 dark:text-gray-300" />
                                        )}
                                    </div>
                                    <div className="text-sm font-medium truncate max-w-xs text-zinc-800 dark:text-gray-200">
                                        {file.name}
                                    </div>
                                </div>

                                <button
                                    onClick={handleRemoveFile}
                                    className="flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-zinc-700 bg-zinc-200 hover:bg-zinc-300 dark:text-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4 mr-1" />

                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {!extractedText && file && (
                <div className="flex justify-center mt-4">
                    <button
                        className={`px-3 py-2 rounded-xl font-semibold transition-all duration-300 ${
                            isLoading
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-transparent border border-[#8B5DFF] text-[#8B5DFF] hover:bg-[#8B5DFF] hover:text-gray-200"
                        }`}
                        onClick={handleExtractText}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Extract Text"}
                    </button>
                </div>
            )}

            {extractedText && (
                <div className="flex justify-center items-center flex-col">
                    <div className="w-[80vw] mx-auto mt-6 px-4">
                        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-4 transition-colors duration-300 w-full">
                            <h3 className="font-medium text-lg mb-2 text-zinc-800 dark:text-gray-200">Extracted Text:</h3>
                            <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-md text-zinc-700 dark:text-gray-300 whitespace-pre-line">
                                {extractedText}
                            </div>
                        </div>
                    </div>
                    <button  className=' my-5 px-3 py-2 rounded-xl font-semibold transition-all duration-300
                        bg-transparent border border-[#8B5DFF] text-[#8B5DFF] hover:bg-[#8B5DFF] hover:text-gray-200
                    ' onClick={handleRemoveFile}>Convert New</button>
                </div>


            )}
        </div>
    );
}