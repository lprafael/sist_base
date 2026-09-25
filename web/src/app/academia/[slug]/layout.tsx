import { Metadata } from 'next';
import React from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const slug = params?.slug;

  if (!slug) {
    return {
      title: 'Academia Deportiva | MiCancha',
    };
  }

  try {
    const res = await fetch(`${API_URL}/api/academias/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        title: 'Academia Deportiva | MiCancha',
      };
    }

    const data = await res.json();
    if (!data || !data.nombre) {
      return {
        title: 'Academia Deportiva | MiCancha',
      };
    }

    const title = `${data.nombre} | Academia Deportiva`;

    let description = data.descripcion ? data.descripcion.trim() : '';
    const extraDetails: string[] = [];
    if (data.ciudad || data.departamento) {
      extraDetails.push([data.ciudad, data.departamento].filter(Boolean).join(', '));
    }
    if (data.telefono || data.whatsapp) {
      extraDetails.push(`Contacto: ${data.telefono || data.whatsapp}`);
    }

    if (!description) {
      description = extraDetails.length > 0
        ? `Academia deportiva en ${extraDetails.join(' · ')}. Consulta disciplinas, horarios, sucursales y aranceles en MiCancha.`
        : `Conoce las disciplinas, horarios formativos, sucursales y tarifas de ${data.nombre} en MiCancha.`;
    } else if (extraDetails.length > 0) {
      description = `${description} — ${extraDetails.join(' · ')}`;
    }

    // Priorizar logo para vista previa de WhatsApp, o banner si no hay logo
    let imageUrl = data.logo_url || data.banner_url || 'https://micancha.com.py/logo512.png';
    if (imageUrl.startsWith('/')) {
      imageUrl = `https://api.micancha.com.py${imageUrl}`;
    }

    const pageUrl = `https://micancha.com.py/academia/${slug}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: 'MiCancha',
        images: [
          {
            url: imageUrl,
            alt: data.nombre,
          },
        ],
        locale: 'es_PY',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: pageUrl,
      },
    };
  } catch {
    return {
      title: 'Academia Deportiva | MiCancha',
    };
  }
}

export default function AcademiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
