import React from 'react';

interface WorryTreeProps {
  children: React.ReactNode;
}

const WorryTree: React.FC<WorryTreeProps> = ({ children }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute bottom-0 w-full h-full z-10">
        <img 
          src="https://clipart-library.com/images_k/tree-transparent-background/tree-transparent-background-2.png" 
          alt="Worry Tree" 
          className="w-full h-full object-contain object-bottom pointer-events-none" 
        />
      </div>
      {children}
    </div>
  );
};

export default WorryTree;