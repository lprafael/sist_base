import { Metadata } from 'next';
import React from 'react';

const API_URL = "https://api.micancha.com.py";

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  // Await the params to be compatible with Next.js 15+
  const params = await props.params;
  const slug = params.slug;

  try {
    const res = await fetch(`${API_URL}/liga/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return {
        title: 'Organizador | MiCancha',
      };
    }
    const data = await res.json();
    const perfil = data.perfil;

    if (!perfil) {
      return {
        title: 'Organizador | MiCancha',
      };
    }

    const title = perfil.nombre_liga || perfil.nombre || 'Organizador';
    const description = perfil.descripcion || perfil.acerca_de || `Perfil de ${title} en MiCancha.`;
    // Use the logo_url if available, else a default image
    const image = perfil.logo_url || perfil.banner_url || 'https://micancha.com.py/logo512.png';

    return {
      title: `${title} | MiCancha`,
      description: description,
      openGraph: {
        title: title,
        description: description,
        images: [
          {
            url: image,
            alt: title,
          }
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: description,
        images: [image],
      }
    };
  } catch (error) {
    return {
      title: 'Organizador | MiCancha',
    };
  }
}

export default function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
