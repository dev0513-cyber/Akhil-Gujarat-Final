import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security Regression', () => {
  it('does not expose the service-role key as the anon key in environment', () => {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      
      let anonKey = '';
      let serviceRoleKey = '';
      
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          
          if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = val;
          if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
        }
      });

      if (anonKey && serviceRoleKey) {
        expect(anonKey).not.toEqual(serviceRoleKey);
      }
    } else {
      // If no env file exists during CI, explicitly assert its absence as the reason for passing
      expect(fs.existsSync(envPath)).toBe(false);
    }
  });
});
