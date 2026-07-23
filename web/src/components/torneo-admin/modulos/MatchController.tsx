import React from 'react';
import FootballController from './FootballController';
import MMAController from './MMAController';

export default function MatchController({ match, deporte, onClose, onSaved }: { match: any, deporte?: string, onClose: () => void, onSaved?: () => void }) {
  if (deporte === 'Artes Marciales Mixtas' || deporte === 'MMA') {
    return <MMAController match={match} onClose={onClose} onSaved={onSaved} />;
  }
  
  return <FootballController match={match} onClose={onClose} onSaved={onSaved} />;
}
