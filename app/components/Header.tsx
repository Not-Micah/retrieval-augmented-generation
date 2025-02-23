import { gapi } from 'gapi-script';

interface HeaderProps {
  emailCount: number;
  eventCount: number;
  taskCount: number;
}

export const Header = ({ emailCount, eventCount, taskCount }: HeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-light text-gray-800">Personal AI Assistant</h1>
        <button 
          // @ts-ignore 
          onClick={() => gapi.auth2.getAuthInstance().signOut()}
          className="px-4 py-2 text-white text-sm bg-black/80 rounded-lg"
        >
          Sign Out
        </button>
      </div>
      <p className="text-left text-sm text-gray-500">
        {emailCount} unread emails • {eventCount} upcoming events • {taskCount} tasks
      </p>
    </div>
  );
};
