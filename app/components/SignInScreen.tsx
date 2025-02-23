import { gapi } from 'gapi-script';

export const SignInScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <button 
        // @ts-ignore
        onClick={() => gapi.auth2.getAuthInstance().signIn()}
        className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  );
};
