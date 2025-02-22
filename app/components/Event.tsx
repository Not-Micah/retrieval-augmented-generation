import React from 'react'

interface EventProps {
    description: string;
    startTime?: string;
    endTime?: string;
}

function Event({ description, startTime, endTime }: EventProps) {
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        
        // Check if it's a date-only string (YYYY-MM-DD)
        if (dateString.length === 10) {
            return date.toLocaleDateString();
        }
        
        // It's a full datetime
        return date.toLocaleString();
    };

    return (
        <div className="w-full p-4 mb-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <p className="text-gray-800 font-medium">{description}</p>
            {(startTime || endTime) && (
                <div className="mt-2 text-sm text-gray-500">
                    {startTime && <span>{formatDateTime(startTime)}</span>}
                    {startTime && endTime && <span> - </span>}
                    {endTime && <span>{formatDateTime(endTime)}</span>}
                </div>
            )}
        </div>
    )
}

export default Event
