import React from 'react';
import 'tailwindcss/tailwind.css';

const features = [
    { icon: '📄', title: 'Insert PDF', description: 'Upload and analyze PDF documents.' },
    { icon: '🎥', title: 'Insert Video', description: 'Upload and analyze video files.' },
    { icon: '🖼️', title: 'Insert Image', description: 'Upload and analyze image files.' },
    { icon: '📝', title: 'Insert Text', description: 'Upload and analyze text files.' },
];

const Landing = () => {
    const handleClick = (feature) => {
        console.log(`Feature clicked: ${feature.title}`);
    };

    return (
        // Locate it at the bottom of the page using flexbox
        <div className="grid grid-cols-2 gap-4 mb-4 p-4">
            {features.map((feature, index) => (
                <div
                    key={index}
                    className="flex flex-col items-start h-auto py-2 px-4 text-left w-full bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out cursor-pointer"
                    onClick={() => handleClick(feature)}
                >
                    <div className="flex w-full">
                        <span className="inline-block whitespace-normal text-xs break-words">{feature.icon} {feature.title}</span>
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                        {feature.description}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Landing;