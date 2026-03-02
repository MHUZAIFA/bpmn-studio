import { AIProvider } from '@/types';
import { GroqProvider } from './providers/groqProvider';

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new GroqProvider();
  }
  return providerInstance;
}

export { GroqProvider };
