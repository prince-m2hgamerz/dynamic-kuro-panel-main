import { useNavigationContext } from '@/contexts/NavigationContext';

export const useNavigationDirection = () => {
  const { direction, navigate, goBack } = useNavigationContext();
  
  return {
    direction,
    navigate,
    goBack,
    isForward: direction === 'forward',
    isBack: direction === 'back',
  };
};
