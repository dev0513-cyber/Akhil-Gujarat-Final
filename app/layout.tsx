
import '@/index.css';

export const metadata = {
  title: 'Akhil Gujarat - અખિલ ગુજરાત',
  description: 'Akhil Gujarat - Latest Gujarati News',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://akhilgujarat.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="gu" data-scroll-behavior="smooth">
      <body>
        {children}
      </body>
    </html>
  )
}