import React from 'react'

function Event({ description }: { description: string }) {
    return (
        <div className="w-full p-4 mb-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <p className="text-gray-800">{description}</p>
        </div>
    )
}

export default Event
