import { Metadata } from 'next';
import EPaperClient from './EPaperClient';

export const metadata: Metadata = {
  title: 'ઈ-પેપર (E-Paper)',
  description: 'અખિલ ગુજરાત દૈનિક ઈ-પેપર વાંચો અને ડાઉનલોડ કરો.',
};

export default function EPaperPage() {
  return <EPaperClient />;
}
