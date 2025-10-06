export const metadata = {
  title: 'Gemma Chat API',
  description: 'AI-powered chat API using Google Gemma 2B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
