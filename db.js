// Importar variables de entorno y dependencias
import dotenv from "dotenv";
dotenv.config();
import { MongoClient, ObjectId } from "mongodb";

// URL de conexión a la base de datos
const urlMongo = process.env.DB_URL;

// GIF inicial
const gifInicial = "https://i.gifer.com/3z9a.gif";

// Función para conectar a la base de datos
function conectar() {
  return MongoClient.connect(urlMongo);
}

// Obtener todas las decisiones de un usuario concreto
export function leerDecisiones(usuario) {
  return new Promise((ok, ko) => {
    conectar()
      .then((conexion) => {
        let coleccion = conexion.db("decisiones").collection("decisiones");

        coleccion
          .find({ usuario }) // solo las del usuario actual
          .toArray()
          .then((decisiones) => {
            console.log("Decisiones obtenidas:", decisiones);
            conexion.close();
            ok(
              decisiones.map(({ _id, texto, resultado, exito,tipo }) => {
                return { id: _id, texto, resultado, exito,tipo };
              })
            );
          })
          .catch(() => {
            console.log("Error al obtener las decisiones");
            ko({ error: "error en base de datos" });
          });
      })
      .catch(() => {
        console.log("Error al conectar con la base de datos");
        ko({ error: "error en base de datos" });
      });
  });
}

// Crear una nueva decisión
export function crearDecision({ texto, resultado, exito, usuario,tipo }) {
  return new Promise((ok, ko) => {
    conectar()
      .then((conexion) => {
        const coleccion = conexion.db("decisiones").collection("decisiones");

        coleccion
          .insertOne({ texto, resultado, exito, usuario,tipo }) // Guardamos también el usuario
          .then(({ insertedId }) => {
            conexion.close();
            ok({
              id: insertedId.toString(),
              texto,
              resultado,
              exito,
              tipo,
            });
          })
          .catch(() => {
            ko({ error: "error en base de datos" });
          });
      })
      .catch(() => {
        ko({ error: "error en base de datos" });
      });
  });
}

// Borrar una decisión
export function borrarDecision(id) {
  return new Promise((ok, ko) => {
    conectar()
      .then((conexion) => {
        let coleccion = conexion.db("decisiones").collection("decisiones");

        coleccion
          .deleteOne({ _id: new ObjectId(id) })
          .then(({ deletedCount }) => {
            conexion.close();
            ok(deletedCount);
          })
          .catch(() => {
            ko({ error: "error en base de datos" });
          });
      })
      .catch(() => {
        ko({ error: "error en base de datos" });
      });
  });
}

// Editar el texto de una decisión
export function editarDecision(id, texto) {
  return new Promise((ok, ko) => {
    conectar()
      .then((conexion) => {
        let coleccion = conexion.db("decisiones").collection("decisiones");

        coleccion
          .findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { texto } },
            { returnDocument: "after" }
          )
          .then(({ value }) => {
            conexion.close();
            ok(value);
          })
          .catch(() => {
            ko({ error: "error en base de datos" });
          });
      })
      .catch(() => {
        ko({ error: "error en base de datos" });
      });
  });
}

// Editar el resultado y el éxito de una decisión
export function editarResultado(id, resultado, exito) {
    return new Promise((ok, ko) => {
      conectar()
        .then((conexion) => {
          let coleccion = conexion.db("decisiones").collection("decisiones");
  
          coleccion
            .updateOne({ _id: new ObjectId(id) }, { $set: { resultado, exito } })
            .then(({ modifiedCount }) => {
              conexion.close();
              ok(modifiedCount);
            })
            .catch(() => {
              ko({ error: "error en base de datos" });
            });
        })
        .catch(() => {
          ko({ error: "error en base de datos" });
        });
    });
  }

// Editar solo el "exito" de una decisión
export function editarExito(id, exito) {
  return new Promise((ok, ko) => {
    conectar()
      .then((conexion) => {
        let coleccion = conexion.db("decisiones").collection("decisiones");

        coleccion
          .updateOne(
            { _id: new ObjectId(id) }, // Buscar la decisión
            { $set: { exito: exito } }  // Establecer el nuevo valor de "exito"
          )
          .then(({ modifiedCount }) => {
            if (modifiedCount === 0) {
              // Si no se encuentra el documento o no se actualiza
              conexion.close();
              ko({ error: "Decisión no encontrada o no se actualizó" });
            } else {
              coleccion
                .findOne({ _id: new ObjectId(id) })
                .then((updatedDecision) => {
                  conexion.close();
                  ok(updatedDecision); // Retornar la decisión completa con el "exito" actualizado
                })
                .catch(() => {
                  conexion.close();
                  ko({ error: "Error al obtener la decisión actualizada" });
                });
            }
          })
          .catch(() => {
            conexion.close();
            ko({ error: "Error en base de datos" });
          });
      })
      .catch(() => {
        ko({ error: "Error en la conexión a la base de datos" });
      });
  });
}

