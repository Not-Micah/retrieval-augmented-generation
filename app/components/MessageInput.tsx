import { IoSend } from "react-icons/io5";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sending: boolean;
}

export const MessageInput = ({ value, onChange, onSubmit, sending }: MessageInputProps) => {
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="text"
        className="w-full p-4 pr-12 rounded-lg bg-gray-100 border-0 outline-none text-gray-800 placeholder-gray-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about your emails or calendar events..."
      />
      <button
        type="submit"
        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md transition-opacity ${
          sending ? "opacity-50" : "opacity-100 hover:opacity-80"
        }`}
        disabled={sending}
      >
        <IoSend size={20} className="text-gray-800" />
      </button>
    </form>
  );
};
