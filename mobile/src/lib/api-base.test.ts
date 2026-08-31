import { API_BASE } from './api-base';

jest.mock('expo-constants', () => ({ expoConfig: { hostUri: '192.168.1.42:8081' } }));

describe('API_BASE', () => {
  it('derives the backend host from the Metro dev server', () => {
    expect(API_BASE).toBe('http://192.168.1.42:3100');
  });
});
