---
applyTo: "frontend/**/*.{ts,tsx}"
---

# Frontend TypeScript/React Instructions

## TypeScript Strict Mode

**Always enable strict mode in tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## React Component Patterns

**Functional Components with TypeScript:**
```typescript
import { FC } from 'react';

interface UserCardProps {
  user: User;
  onEdit?: (userId: string) => void;
}

export const UserCard: FC = ({ user, onEdit }) => {
  return (
    
      {user.name}
      {onEdit && (
        <button onClick={() => onEdit(user.id)}>Edit
      )}
    
  );
};
```

**Custom Hooks:**
```typescript
import { useState, useEffect } from 'react';

interface UseApiOptions {
  initialData?: T;
  enabled?: boolean;
}

export function useApi(
  url: string,
  options: UseApiOptions = {}
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState(options.initialData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (options.enabled === false) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [url, options.enabled]);
  
  return { data, loading, error };
}
```

## TanStack Query Patterns

**Query Hooks:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// GET request
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
  });
}

// POST/PUT/DELETE with optimistic updates
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: ProfileFormData) => {
      const { data } = await api.put('/profile', profile);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Or optimistically update
      queryClient.setQueryData(['profile'], data);
    },
    onError: (error) => {
      toast.error('Failed to update profile');
    },
  });
}
```

**Background Job Polling:**
```typescript
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/search/status/${jobId}`);
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when complete
      if (data?.status === 'complete' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}
```

## Zustand State Management
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // LocalStorage key
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
```

## Form Validation with Zod
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const profileSchema = z.object({
  companyName: z.string()
    .min(2, 'Company name too short')
    .max(200, 'Company name too long'),
  
  primaryNaics: z.string()
    .length(6, 'NAICS must be 6 digits')
    .regex(/^\d+$/, 'NAICS must be numeric'),
  
  email: z.string()
    .email('Invalid email')
    .toLowerCase(),
  
  targetContractMin: z.number()
    .min(0, 'Must be positive')
    .max(100_000_000, 'Exceeds maximum'),
}).refine(
  (data) => data.targetContractMax >= data.targetContractMin,
  {
    message: 'Max must be >= Min',
    path: ['targetContractMax'],
  }
);

type ProfileFormData = z.infer;

export function ProfileForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
  });
  
  const onSubmit = (data: ProfileFormData) => {
    console.log(data); // Type-safe!
  };
  
  return (
    
      
      {errors.companyName && {errors.companyName.message}}
    
  );
}
```

## Error Handling
```typescript
import { AxiosError } from 'axios';

interface ApiError {
  detail: string;
  status: number;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    return apiError?.detail || 'An error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown error';
}

// Usage in component
const mutation = useMutation({
  mutationFn: updateProfile,
  onError: (error) => {
    const message = handleApiError(error);
    toast.error(message);
  },
});
```

## Tailwind CSS Conventions
```tsx
// Use semantic class names, avoid arbitrary values

  Title
  
    Action
  


// Use custom colors from theme
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
    },
  },
};
```

## Component Organization
```
components/
├── ui/                    # Reusable UI primitives (shadcn)
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
│
├── layout/                # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Layout.tsx
│
└── features/              # Feature-specific components
    ├── auth/
    │   ├── LoginForm.tsx
    │   └── RegisterForm.tsx
    ├── profile/
    │   ├── ProfileWizard.tsx
    │   └── ProfileSummary.tsx
    └── search/
        ├── SearchResults.tsx
        └── OpportunityCard.tsx
```

## Performance Optimization

**Memoization:**
```typescript
import { useMemo, useCallback } from 'react';

export function ExpensiveComponent({ items }: { items: Item[] }) {
  // Memoize expensive computations
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => b.score - a.score);
  }, [items]);
  
  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);
  
  return (
    
      {sortedItems.map((item) => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        
      ))}
    
  );
}
```

**Code Splitting:**
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function App() {
  return (
    }>
      
    
  );
}
```