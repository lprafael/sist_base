// Mock para evitar errores de build con @capacitor-community/background-geolocation
// Este plugin es nativo y suele fallar en builds de Vite para web si no está bien empaquetado.

export const BackgroundGeolocation = {
    addWatcher: async () => {
        console.warn("BackgroundGeolocation: Mock activo (solo disponible en dispositivos nativos)");
        return "mock-watcher-id";
    },
    removeWatcher: async () => {
        return;
    }
};

export default BackgroundGeolocation;
