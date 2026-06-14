import React from 'react';
import { useReducedMotion } from 'framer-motion';
import LiquidEtherComponent from './LiquidEther/LiquidEther.jsx';
import './LiquidEtherSky.css';

const CLOUD_WHITE_COLORS = ['#EAF7FF', '#FFFFFF', '#CFEFFF'];

export const LiquidEther = LiquidEtherComponent;

export const LiquidEtherSky: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="liquid-ether-sky">
      <div className="liquid-ether-sky__gradient" />
      {!reduceMotion && (
        <LiquidEtherComponent
          mouseForce={14}
          cursorSize={86}
          isViscous={false}
          viscous={24}
          iterationsViscous={12}
          iterationsPoisson={18}
          colors={CLOUD_WHITE_COLORS}
          autoDemo
          autoSpeed={0.22}
          autoIntensity={1.1}
          isBounce={false}
          resolution={0.36}
          className="liquid-ether-sky__ether"
          style={{ position: 'absolute', inset: '-8%', width: 'auto', height: 'auto' }}
        />
      )}
      <div className="liquid-ether-sky__clouds liquid-ether-sky__clouds--main" />
      <div className="liquid-ether-sky__clouds liquid-ether-sky__clouds--wisps" />
      <div className="liquid-ether-sky__readability" />
      <div className="liquid-ether-sky__haze" />
    </div>
  );
};
