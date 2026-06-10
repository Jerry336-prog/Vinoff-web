import { useContext } from 'react';
import { ChatContext } from '../context/ChatContext';

export const useChats = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChats must be used within a ChatProvider');
  }
  return context;
};

export default useChats;
