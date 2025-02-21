import React from 'react'

interface MessageProps {
    subject: string;
    from: string;
}

function Message({ subject, from }: MessageProps) {
    return (
        <div className="w-full p-4 mb-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <h3 className="text-lg font-medium text-gray-800">{subject}</h3>
            <p className="text-sm text-gray-500 mt-1">{from}</p>
        </div>
    )
}

export default Message
