/**
 * useAuth Hook
 * 
 * Re-exports useAuth from AuthContext for backwards compatibility.
 * Components can import from either location.
 */
import { useAuth } from '@/src/context/AuthContext';

export { useAuth };
export default useAuth;


