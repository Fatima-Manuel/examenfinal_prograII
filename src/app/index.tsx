import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { supabase } from '../../database/supabase';

export default function HomeScreen() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [registrarse, setRegistrarse] = useState(false);
  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [carrera, setCarrera] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Mostrar mensajes tanto en web como en celular
  const mostrarMensaje = (titulo: string, texto: string) => {
    setMensaje(`${titulo}: ${texto}`);

    if (Platform.OS !== 'web') {
      Alert.alert(titulo, texto);
    }
  };

  // Registrar estudiante o iniciar sesión
  const ingresar = async () => {
    if (cargando) return;

    setMensaje('');

    if (!correo.trim() || !contrasena.trim()) {
      mostrarMensaje('Error', 'Completa el correo y la contraseña');
      return;
    }

    if (registrarse) {
      if (!nombre.trim() || !carnet.trim() || !carrera.trim()) {
        mostrarMensaje('Error', 'Completa todos los datos del estudiante');
        return;
      }
    }

    setCargando(true);

    try {
      if (registrarse) {
        // Crear cuenta de estudiante
        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: contrasena,
          options: {
            data: {
              nombre: nombre.trim(),
              carnet: carnet.trim(),
              carrera: carrera.trim(),
              rol: 'Estudiante',
            },
          },
        });

        if (error) {
          mostrarMensaje('Error', error.message);
          return;
        }

        if (!data.user) {
          mostrarMensaje('Error', 'No se pudo crear la cuenta');
          return;
        }

        // Si Supabase requiere confirmar el correo,
        // el perfil se guardará después de iniciar sesión.
        if (!data.session) {
          mostrarMensaje(
            'Aviso',
            'Revisa tu correo para confirmar tu cuenta. Después inicia sesión.'
          );

          setRegistrarse(false);
          return;
        }

        // Guardar información del estudiante
        const { error: errorPerfil } = await supabase
          .from('estudiantes')
          .insert({
            user_id: data.user.id,
            nombre: nombre.trim(),
            carnet: carnet.trim(),
            carrera: carrera.trim(),
          });

        if (errorPerfil) {
          mostrarMensaje(
            'Error al guardar el perfil',
            errorPerfil.message
          );
          return;
        }

        mostrarMensaje(
          'Éxito',
          'Estudiante registrado correctamente'
        );

        setRegistrarse(false);
        setContrasena('');

      } else {
        // Iniciar sesión
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: correo.trim(),
            password: contrasena,
          });

        if (error) {
          mostrarMensaje('Error', error.message);
          return;
        }

        if (!data.user) {
          mostrarMensaje('Error', 'No se pudo iniciar sesión');
          return;
        }

        // Buscar el perfil del estudiante
        const { data: perfil, error: errorConsulta } = await supabase
          .from('estudiantes')
          .select('id, nombre, carnet, carrera')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (errorConsulta) {
          mostrarMensaje('Error', errorConsulta.message);
          return;
        }

        // Completar perfil si se confirmó el correo
        if (!perfil) {
          const datos = data.user.user_metadata;

          if (
            datos?.rol === 'Estudiante' &&
            datos?.nombre &&
            datos?.carnet &&
            datos?.carrera
          ) {
            const { error: errorPerfil } = await supabase
              .from('estudiantes')
              .insert({
                user_id: data.user.id,
                nombre: datos.nombre,
                carnet: datos.carnet,
                carrera: datos.carrera,
              });

            if (errorPerfil) {
              mostrarMensaje(
                'Error al guardar el perfil',
                errorPerfil.message
              );
              return;
            }

            mostrarMensaje(
              'Éxito',
              'Bienvenido al sistema, ' + datos.nombre
            );
          } else {
            mostrarMensaje(
              'Aviso',
              'Sesión iniciada. No se encontró un perfil de estudiante.'
            );
          }
        } else {
          mostrarMensaje(
            'Éxito',
            'Bienvenido al sistema, ' + perfil.nombre
          );
        }
      }
    } catch (error) {
      mostrarMensaje(
        'Error',
        'Ocurrió un problema de conexión. Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>
        Sistema de Gestión de Equipos
      </Text>

      <Text style={styles.subtitulo}>
        Laboratorio Universitario
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.encabezado}>
          {registrarse
            ? 'Registro de estudiante'
            : 'Iniciar sesión'}
        </Text>

        {registrarse && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              value={nombre}
              onChangeText={setNombre}
            />

            <TextInput
              style={styles.input}
              placeholder="Carnet universitario"
              value={carnet}
              onChangeText={setCarnet}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Carrera universitaria"
              value={carrera}
              onChangeText={setCarrera}
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.boton,
            cargando && styles.botonDeshabilitado,
          ]}
          onPress={ingresar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBoton}>
              {registrarse ? 'Registrarse' : 'Ingresar'}
            </Text>
          )}
        </TouchableOpacity>

        {mensaje !== '' && (
          <Text style={styles.mensaje}>
            {mensaje}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => {
            setRegistrarse(!registrarse);
            setMensaje('');
          }}
        >
          <Text style={styles.enlace}>
            {registrarse
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F2F4F8',
    justifyContent: 'center',
    padding: 25,
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1E3A8A',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 35,
  },

  formulario: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 12,
    elevation: 4,
  },

  encabezado: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },

  boton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  enlace: {
    color: '#2563EB',
    textAlign: 'center',
    marginTop: 20,
  },

  mensaje: {
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
});