import React, { useEffect, useRef, useState } from "react";
import { FileIcon, Image as ImageIcon, Upload, X, Copy, Smile, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


import axios from "axios";

export default function HomePage() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isImage, setIsImage] = useState(false);
    const [extractedText, setExtractedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [imageType, setImageType] = useState("leftHalfImage");
    const [notificationFlag, setNotificationFlag] = useState(false);
    const fileInputRef = useRef(null);

    const API_URL = process.env.REACT_APP_API_URL;
    const API_KEY = process.env.REACT_APP_API_KEY;

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
        setImageType("leftHalfImage");
        setExtractedText("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    async function cropHalf(file, type) {
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

                if (type === "left") {
                    // Draw only the left half of the image
                    ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, canvas.width, canvas.height);
                } else {
                    ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, 0, 0, canvas.width, canvas.height);
                }
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
            let croppedFile;
            if (imageType === "fullImage") {
                croppedFile = file;
            } else if (imageType === "rightHalfImage") {
                croppedFile = await cropHalf(file, "right");
            } else {
                croppedFile = await cropHalf(file, "left");
            }
            // Prepare FormData with the cropped image
            const formData = new FormData();
            formData.append("file", croppedFile);
            formData.append("apikey", API_KEY);
            formData.append("language", "eng");
            formData.append("isOverlayRequired", "false");

            // Send request to OCR API
            let response ;
            await axios.post(API_URL, formData).then((res)=>{
                response = res;
                console.log(res.data);
            }).catch((err) => {
                console.log(err)
            });

            // Check if ParsedResults exists and has at least one item
            if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
                const text = response.data.ParsedResults[0].ParsedText || "No text extracted";
                
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

    function handleCopyText() {
        navigator.clipboard.writeText(extractedText);
        setNotificationFlag(true);
        setTimeout(() => {
            setNotificationFlag(false);
        }, 2000);
    }
    

    return (
        <div className="bg-gray-200 dark:bg-zinc-900 w-full min-h-screen transition-colors duration-300 overflow-x-hidden">
            <h1 className="font-bold text-center pt-3 text-xl sm:text-2xl lg:text-3xl text-zinc-900 dark:text-gray-200 px-4">
                Image To Text Converter
                
            </h1>
            
            {notificationFlag && (
                <AnimatePresence>
                    <motion.div 
                        className="fixed top-4 left-4 sm:top-10 sm:left-10 px-4 sm:px-6 py-2 text-zinc-900 dark:text-gray-200 
                                border border-zinc-900 dark:border-gray-200 flex flex-row gap-1 items-center rounded-full
                                z-50 bg-white dark:bg-zinc-800 shadow-md"
                        initial={{x: -100, opacity: 0, scale: 0.5}}
                        animate={{x: 0, opacity: 1, scale: 1}}
                        transition={{duration: 0.5}}
                    >
                        <p>Text Copied</p> <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.div>
                </AnimatePresence>   
            )}
            
            <div className="w-full px-4 sm:px-6 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto mt-4 sm:mt-6">
                {!file ? (
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-4 sm:p-6 transition-all duration-300
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
                            <Upload className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 text-zinc-500 dark:text-zinc-400" />
                            <p className="mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-zinc-800 dark:text-gray-200">
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

                        <div className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="p-1 sm:p-2 bg-zinc-100 dark:bg-zinc-900 rounded-md">
                                        {isImage ? (
                                            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-700 dark:text-gray-300" />
                                        ) : (
                                            <FileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-700 dark:text-gray-300" />
                                        )}
                                    </div>
                                    <div className="text-xs sm:text-sm font-medium truncate max-w-[160px] sm:max-w-xs text-zinc-800 dark:text-gray-200">
                                        {file.name}
                                    </div>
                                </div>

                                <button
                                    onClick={handleRemoveFile}
                                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md text-zinc-700 bg-zinc-200 hover:bg-zinc-300 dark:text-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors duration-200"
                                >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {file && !extractedText && (
                <div className="flex flex-col sm:flex-row justify-center items-center mt-4 gap-2 sm:gap-4 px-4">
                    <button
                        className={`w-full sm:w-auto px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                            isLoading
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-transparent border border-[#8B5DFF] text-[#8B5DFF] hover:bg-[#8B5DFF] hover:text-gray-200"
                        }`}
                        onClick={handleExtractText}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Extract Text"}
                    </button>
                    
                    {!isLoading && (
                        <select 
                            className="w-full sm:w-auto px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300 
                                      bg-transparent border border-[#8B5DFF] text-[#8B5DFF] 
                                      hover:bg-[#8B5DFF] hover:text-gray-200 
                                      appearance-none cursor-pointer"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238B5DFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.5rem center',
                                paddingRight: '2.5rem'
                            }}
                            onChange={(e) => setImageType(e.target.value)}
                        >
                            <option value="leftHalfImage">Left Half</option>
                            <option value="fullImage">Full Image</option>
                            
                            <option value="rightHalfImage">Right Half</option>
                        </select>
                    )}
                </div>
            )}

            {extractedText && (
                <div className="flex justify-center items-center flex-col px-4">
                    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-[70vw] mx-auto mt-4 sm:mt-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-3 sm:p-4 transition-colors duration-300 w-full">
                            <div className="flex flex-row items-center justify-between">
                                <h3 className="font-medium text-base sm:text-lg mb-2 text-zinc-800 dark:text-gray-200">Extracted Text:</h3>
                                <button 
                                    onClick={handleCopyText}
                                    className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    aria-label="Copy text"
                                >
                                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-800 dark:text-gray-200" />
                                </button>
                            </div>
                            
                            <div className="bg-zinc-100 dark:bg-zinc-900 p-2 sm:p-3 rounded-md text-zinc-700 dark:text-gray-300 whitespace-pre-line text-xs sm:text-sm overflow-auto max-h-60 sm:max-h-80">
                                {extractedText || "No text extracted"}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        className="my-4 sm:my-5 px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300
                                bg-transparent border border-[#8B5DFF] text-[#8B5DFF] hover:bg-[#8B5DFF] hover:text-gray-200"
                        onClick={handleRemoveFile}
                    >
                        Convert New
                    </button>
                </div>
            )}
            <p className="flex items-center justify-center gap-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2" > With <Heart className="text-red-500 "/> Ashwin S I</p>
        </div>
    );
}