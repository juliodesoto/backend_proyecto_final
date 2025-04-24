import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import {
  leerDecisiones,
  crearDecision,
  borrarDecision,
  editarDecision,
  editarResultado,
  editarExito,
} from "./db.js";

import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servidor = express();

servidor.use(cors({
  origin: "http://localhost:5173", // o el puerto donde tengas tu React
  credentials: true // 👈 importante para enviar cookies
}));

servidor.use(express.urlencoded({ extended: true }));

servidor.use(express.json());

const listaUsuarios = [
  { usuario: "Robert_Fripp", password: "Kingoftheking", tipo: "admin" },
  { usuario: "Robert_Wyatt", password: "RockBottom", tipo: "normal" }
];

servidor.set("view engine", "ejs");
servidor.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos como CSS desde /public
servidor.use(express.static(path.join(__dirname, "public")));

servidor.use(express.urlencoded({ extended: true }));

servidor.use(session({
    secret: "abc123",
    resave: true,
    saveUninitialized: false
}));

servidor.get("/session", (req, res) => {
  if (req.session.usuario && req.session.tipo) {
    res.json({
      usuario: req.session.usuario,
      tipo: req.session.tipo
    });
  } else {
    res.json({});
  }
});

servidor.get("/", (req, res) => {
    if (!req.session.usuario) {
        return res.redirect("/login");
    }
    res.render("index", { usuario: req.session.usuario });
});

servidor.get("/login", (req, res) => {
    if (req.session.usuario) {
        return res.redirect("/");
    }
    res.render("login", { error: false });
});

servidor.post("/login", (req, res) => {
  const { usuario, password } = req.body;
  console.log("Body recibido:", req.body); // Solo para debugging

  const usuarioEncontrado = listaUsuarios.find(
    u => u.usuario === usuario && u.password === password
  );

  if (usuarioEncontrado) {
    req.session.usuario = usuarioEncontrado.usuario;
    req.session.tipo = usuarioEncontrado.tipo;
    return res.json({ usuario: req.session.usuario, tipo: req.session.tipo });
  } else {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }
});

servidor.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ cerrado: true });
  });
});


// Pruebas
if (process.env.PRUEBAS) {
  servidor.use("/pruebas", express.static("./pruebas"));
}

// Obtener todas las decisiones
servidor.get("/decisiones", async (peticion, respuesta) => {
  console.log("GET /decisiones");
  try {
    if (!peticion.session.tipo) {
      return respuesta.status(401).json({ error: "No autenticado" });
    }
    const todas = await leerDecisiones();
    const filtradas = todas.filter(d => d.tipo === peticion.session.tipo);
    respuesta.json(filtradas);
  } catch (error) {
    console.error("Error en GET /decisiones:", error);
    respuesta.status(500).json({ error: "Error en el servidor" });
  }
});

// Crear una nueva decisión
servidor.post("/decisiones/nueva", async (peticion, respuesta) => {
  console.log("POST /decisiones/nueva");

  let { texto, resultado = null, exito = null } = peticion.body;

  // Asegurarse de que "texto" sea una cadena
  if (typeof texto !== "string") {
    return respuesta.status(400).json({ error: "Texto debe ser una cadena" });
  }

  texto = texto.trim(); // Eliminar espacios al principio y al final

  const valido = texto && texto !== "";

  if (!valido) {
    return respuesta.status(400).json({ error: "Texto inválido" });
  }

  try {
    const nuevaDecision = await crearDecision({
      texto,
      resultado,
      exito,
      tipo: peticion.session.tipo // ← añadimos el tipo de usuario que está logueado
    });
    return respuesta.status(200).json(nuevaDecision); // ← devolvemos todo
  } catch (error) {
    console.error("Error al crear decisión:", error);
    return respuesta.status(500).json({ error: "Error en el servidor" });
  }
});

// Eliminar una decisión
servidor.delete("/decisiones/borrar/:id", async (peticion, respuesta, siguiente) => {
  try {
    const count = await borrarDecision(peticion.params.id);
    if (count) {
      return respuesta.status(204).send("");
    }
    siguiente(); // 404 si no se encontró
  } catch (error) {
    console.error("Error al borrar:", error);
    respuesta.status(500).json({ error: "Error en el servidor" });
  }
});

// Editar el resultado de una decisión
servidor.put("/decisiones/editar/resultado/:id", async (peticion, respuesta) => {
    const { resultado } = peticion.body;
    const { id } = peticion.params;
  
    // Validar que el resultado sea una cadena no vacía
    if (!resultado || typeof resultado !== "string") {
      return respuesta.status(400).json({ error: "Resultado inválido" });
    }
  
    try {
      const updatedDecision = await editarResultado(id, resultado); // Devuelve la decisión actualizada
  
      if (!updatedDecision) {
        return respuesta.status(404).json({ error: "Decisión no encontrada" });
      }
  
      // Devolver la decisión completa con el resultado actualizado
      return respuesta.status(200).json(updatedDecision);
    } catch (error) {
      console.error("Error al editar resultado:", error);
      respuesta.status(500).json({ error: "Error en el servidor" });
    }
  });

// Editar texto de la decisión
servidor.put("/decisiones/editar/texto/:id", async (peticion, respuesta) => {
  const { texto } = peticion.body;
  const { id } = peticion.params;

  // Validar que el texto no esté vacío
  if (typeof texto !== "string" || texto.trim() === "") {
    return respuesta.status(400).json({ error: "Texto inválido" });
  }

  try {
    const updatedDecision = await editarDecision(id, texto); // Devuelve la decisión actualizada
    if (!updatedDecision) {
      return respuesta.status(404).json({ error: "Decisión no encontrada" });
    }

    // Devolver la decisión completa con el texto actualizado
    return respuesta.status(200).json(updatedDecision);
  } catch (error) {
    console.error("Error al editar texto:", error);
    respuesta.status(500).json({ error: "Error en el servidor" });
  }
});

// Editar éxito de la decisión
servidor.put("/decisiones/editar/exito/:id", async (peticion, respuesta) => {
  let { exito } = peticion.body;

  if (typeof exito !== "boolean") {
    return respuesta.status(400).json({ error: "El valor de éxito debe ser un booleano" });
  }

  try {
    const updatedDecision = await editarExito(peticion.params.id, exito);
    if (!updatedDecision) {
      return respuesta.status(404).json({ error: "Decisión no encontrada" });
    }

    return respuesta.status(200).json(updatedDecision);
  } catch (error) {
    console.error("Error al editar éxito:", error);
    respuesta.status(500).json({ error: "Error en el servidor" });
  }
});

// Manejo de errores
servidor.use((error, peticion, respuesta, siguiente) => {
  console.error("Error en la petición:", error);
  respuesta.status(400).json({ error: "Error en la petición" });
});

// Ruta para cuando no se encuentra el recurso
servidor.use((peticion, respuesta) => {
  respuesta.status(404).json({ error: "Recurso no encontrado" });
});

const PORT = process.env.PORT || 3000;
servidor.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
