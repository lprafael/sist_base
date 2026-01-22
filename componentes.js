import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { APIProvider, Map } from '@vis.gl/react-google-maps';

// Esta parte genera la cabecera de página
function CabeceradePagina() {
  return (
    <header>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>CIDSA - VMT</title>
      {/* Logo CIDSA (debe estar en public/imágenes/Logo_CIDSA.jpg) */}
      <h1>
        Cabecera
      </h1>
      <img
        src="/imágenes/Logo_CIDSA2.jpg"
        alt="Logo CIDSA"
        style={{ height: 60, marginRight: 16 }}
      />
    </header>
  );
}



function MiPaginaExistente() {
  // Estado para mostrar el sidebar principal
  const orejitaStyle = {
    position: "absolute",
    top: "50%",
    right: "-18px",
    transform: "translateY(-50%)",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "0 6px 6px 0",
    width: "36px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    cursor: "pointer",
    zIndex: 1002,
  };
  // Estado para mostrar el sidebar derecho
  const orejitaOcultaStyle = {
    position: "fixed",
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "0 6px 6px 0",
    width: "36px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    cursor: "pointer",
    zIndex: 1002,
  };

  // Estado para mostrar/ocultar el sidebar principal
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <>
      <div className="container" style={{ border: "2px solid blue" }}>
        <CabeceradePagina />
        <div className="mobile-tabs">
          <div className="mobile-tab active" data-tab="info">Información</div>
          <div className="mobile-tab" data-tab="map">Mapa</div>
        </div>
        <div className="content" style={{ display: 'flex', position: 'relative', height: '100%' }}>
          {/* Sidebar principal para selectores y botones */}
          {sidebarVisible && (
            <div className="sidebar" style={{ border: "2px solid blue", position: 'relative', minWidth: 220, transition: 'all 0.3s' }}>
              <h1>Contenido</h1>
            </div>
          )}
          <div style={{
            position: "relative",
            height: "100%",
            flex: 1,
            overflow: "hidden",
            pointerEvents: "auto"
          }}>
            <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
              <Map
                style={{
                  width: '100%',
                  height: '100%',
                  zIndex: 1
                }}
                center={{ lat: -25.3167, lng: -57.5667 }}
                zoom={11}
                gestureHandling="greedy"
                disableDefaultUI={false}
                onLoad={() => console.log('Mapa cargado exitosamente')}
                options={{
                  zoomControl: true,
                  scrollwheel: true,
                  draggable: true,
                  panControl: true,
                  streetViewControl: false,
                  mapTypeControl: true,
                  fullscreenControl: false
                }}
              />
            </APIProvider>
            
            {/* Tarjeta Power BI flotante arriba del mapa */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "linear-gradient(90deg, #e3f2fd 60%, #bbdefb 100%)",
                boxShadow: "0 4px 16px rgba(30,60,120,0.13)",
                borderRadius: 16,
                padding: "18px 38px 14px 38px",
                minWidth: 320,
                maxWidth: 480,
                textAlign: "center",
                border: "2px solid #1976d2",
                fontFamily: "Segoe UI, Arial, sans-serif",
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>
                Tarjeta:
              </div>
              <div style={{ fontSize: 18, color: "#0d47a1", marginTop: 2 }}>
                Información:
              </div>
            </div>
            
            {/* Botón de la orejita */}
            <button
              style={sidebarVisible
                ? { ...orejitaStyle, left: '0px', top: '50%', position: 'absolute', zIndex: 20, transition: 'right 0.3s', pointerEvents: 'auto' }
                : { ...orejitaOcultaStyle, left: 0, top: '50%', position: 'absolute', zIndex: 20, transition: 'left 0.3s', pointerEvents: 'auto' }}
              onClick={() => setSidebarVisible(!sidebarVisible)}
              aria-label={sidebarVisible ? "Ocultar sidebar" : "Mostrar sidebar"}
            >
              {/* SVG hamburguesa */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="4" width="24" height="3" rx="1.5" fill="white"/>
                <rect y="10.5" width="24" height="3" rx="1.5" fill="white"/>
                <rect y="17" width="24" height="3" rx="1.5" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="alerta" className="alert" style={{ display: "none" }}></div>
      </div>
    </>
  );
}

export default MiPaginaExistente;
