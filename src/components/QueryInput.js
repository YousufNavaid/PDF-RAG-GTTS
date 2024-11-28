import React from "react";

const QueryInput = ({
  query,
  setQuery,
  queryInputRef,
  handleQuerySubmit,
  disabled,
}) => {
  return (
    <div className="md:w-[70%] w-full flex items-center gap-5 justify-between mt-4 border rounded-full p-4">
      <input
        ref={queryInputRef}
        type="text"
        placeholder="Enter your query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-[80%] p-2 border-none  focus:outline-none"
      />
      <button
        onClick={handleQuerySubmit}
        disabled={!query || disabled}
        className="w-[10%] rounded-full bg-blue-500 text-white p-2 disabled:bg-gray-400"
      >
        Ask
      </button>
    </div>
  );
};

export default QueryInput;
