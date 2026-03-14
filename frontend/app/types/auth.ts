export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  isEmailVerified: boolean;
  masterResumeUrl?: string;
  masterProfileJson?: MasterProfile | null;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'kanban' | 'list';
}

export interface MasterProfile {
  summary?: string;
  skills?: string[];
  experience?: WorkExperience[];
  education?: Education[];
  certifications?: string[];
  languages?: string[];
}

export interface WorkExperience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  graduationDate?: string;
  gpa?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileRequest {
  name?: string;
  preferences?: UserPreferences;
}
