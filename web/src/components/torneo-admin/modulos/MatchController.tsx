import React from 'react';
import FootballController from './FootballController';
import MMAController from './MMAController';
import KarateWKFController from './KarateWKFController';
import KataWKFController from './KataWKFController';
import BasketballController from './BasketballController';

export default function MatchController({
  match,
  deporte,
  onClose,
  onSaved
}: {
  match: any;
  deporte?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const isKarate = deporte === 'Karate' || deporte === 'Karate WKF' || deporte === 'Karate PKF' ||
    (match.fase || '').toLowerCase().includes('karate') || (match.deporte || '').toLowerCase().includes('karate');

  if (isKarate) {
    const isKata = (match.fase || '').toLowerCase().includes('kata') ||
      (match.fase || '').toLowerCase().includes('forma') ||
      (!match.jugador_visitante_id && !match.equipo_visitante_id);

    if (isKata) {
      return <KataWKFController match={match} onClose={onClose} onSaved={onSaved || (() => {})} />;
    }
    return <KarateWKFController match={match} onClose={onClose} onSaved={onSaved} />;
  }

  const isBasketball = deporte === 'Baloncesto' || deporte === 'Básquetbol' || deporte === 'Básquet' || deporte === 'Basketball' ||
    (match.fase || '').toLowerCase().includes('baloncesto') || (match.fase || '').toLowerCase().includes('basket') ||
    (match.deporte || '').toLowerCase().includes('baloncesto') || (match.deporte || '').toLowerCase().includes('basket');

  if (isBasketball) {
    return <BasketballController match={match} onClose={onClose} onSaved={onSaved} />;
  }

  if (deporte === 'Artes Marciales Mixtas' || deporte === 'MMA') {
    return <MMAController match={match} onClose={onClose} onSaved={onSaved} />;
  }
  
  return <FootballController match={match} onClose={onClose} onSaved={onSaved} />;
}

