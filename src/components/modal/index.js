import React from 'react';
import styles from './index.module.css';

export default function Modal({ children, onClose }) {
  return (
    <div className={styles.modalContainer}>
      <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
        <div onClick={onClose} style={{ cursor: 'pointer', padding: 5 }}>
          <img src='/assets/icons/close.svg' width='10px'></img>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '0 60px' }}>{children}</div>
    </div>
  );
}
