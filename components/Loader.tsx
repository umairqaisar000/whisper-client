// components/Loader.tsx

const Loader = () => {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="loader animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-500"></div>
        </div>
    );
};

export default Loader;
