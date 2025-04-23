# POS System (Punto de Venta)

Este es un sistema de punto de venta (POS) moderno desarrollado con React, TypeScript, Tailwind CSS y Zustand. Proporciona una interfaz intuitiva para la gestión de ventas, facturación y gestión de clientes y productos.

## Características Principales

*   **Interfaz de Usuario Intuitiva:** Diseño limpio y fácil de usar con React y Tailwind CSS.
*   **Gestión de Productos:**  Agregar, editar y eliminar productos del catálogo.
*   **Gestión de Clientes:**  Registro y gestión de información de clientes.
*   **Facturación:**  Generación de facturas con cálculo automático de impuestos.
*   **Carrito de Compras:**  Gestión sencilla de los artículos en la venta actual.
*   **Autenticación:**  Sistema de inicio de sesión seguro (simulado con datos de ejemplo).
*   **Responsive Design:**  Adaptado para funcionar en diferentes dispositivos (escritorio, tablets y móviles).

## Tecnologías Utilizadas

*   **React:**  Biblioteca de JavaScript para construir interfaces de usuario.
*   **TypeScript:**  Supers conjunto de JavaScript que añade tipado estático.
*   **Tailwind CSS:**  Framework de CSS para un diseño rápido y consistente.
*   **Zustand:**  Biblioteca para la gestión de estado global de la aplicación.
*   **React Router DOM:**  Para la navegación entre páginas.
*   **Axios:**  Cliente HTTP para realizar peticiones a la API.
*   **Date-fns:**  Librería para el formato de fechas.
*   **Lucide React:** Biblioteca de íconos.
*   **React Hot Toast:** Libreria para la generación de notificaciones
*   **React Router DOM:** Manejo de la navegación entre las diferentes rutas.

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

*   **Node.js:** (Versión 14 o superior). Puedes descargarlo desde [https://nodejs.org/](https://nodejs.org/).
*   **npm o Yarn:**  Gestor de paquetes.  npm se instala con Node.js.

## Instalación

1.  **Clona el repositorio:**

    ```bash
    git clone [URL del repositorio]
    cd pos-system
    ```

2.  **Instala las dependencias:**

    ```bash
    npm install  # o yarn install
    ```

## Configuración

*   **Variables de entorno (opcional):**  Si necesitas configurar variables de entorno (por ejemplo, la URL de la API), crea un archivo `.env` en la raíz del proyecto.

## Ejecución

Para ejecutar el proyecto en modo de desarrollo:

```bash
npm run dev   # o yarn dev
