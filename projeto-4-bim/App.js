import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ----------------------------------------------------
// 1. TELA: HOMESCREEN (Lista da PokéAPI)
// ----------------------------------------------------
function HomeScreen({ navigation }) {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPokemons = async () => {
    try {
      setError(null);
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=30');
      if (!response.ok) throw new Error('Falha ao conectar com a API');
      const data = await response.json();

      const formattedData = data.results.map((item) => {
        const id = item.url.split('/')[item.url.split('/').length - 2];
        return {
          id,
          name: item.name,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        };
      });

      setPokemons(formattedData);
    } catch (err) {
      setError('Não foi possível carregar a lista de Pokémon.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPokemons();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPokemons();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EE1515" />
        <Text style={styles.loadingText}>Carregando Pokémon...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchPokemons}>
          <Text style={styles.buttonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pokemons}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EE1515']} />
        }
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.cardMain}
              onPress={() => navigation.navigate('Detalhes', { id: item.id, name: item.name })}
            >
              <Image source={{ uri: item.image }} style={styles.avatar} />
              <Text style={styles.name}>{item.name.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pushBtn}
              onPress={() => navigation.push('Detalhes', { id: item.id, name: item.name })}
            >
              <Text style={styles.pushBtnText}>Push Detalhes</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ----------------------------------------------------
// 2. TELA: DETAILSCREEN (Detalhes do item)
// ----------------------------------------------------
function DetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const isFocused = useIsFocused();

  const fetchDetails = useCallback(async () => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      setDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkFavorite = useCallback(async () => {
    try {
      const storedFavs = await AsyncStorage.getItem('@favorites_pokemon');
      const favorites = storedFavs ? JSON.parse(storedFavs) : [];
      setIsFavorite(favorites.some((fav) => fav.id === id.toString()));
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (isFocused) {
      checkFavorite();
    }
  }, [isFocused, checkFavorite]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EE1515" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.detailContainer}>
      <Image
        source={{
          uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        }}
        style={styles.image}
      />
      <Text style={styles.title}>{details?.name.toUpperCase()}</Text>

      <View style={styles.badgeContainer}>
        {details?.types.map((t) => (
          <View key={t.type.name} style={styles.badge}>
            <Text style={styles.badgeText}>{t.type.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Altura: {details?.height / 10} m</Text>
        <Text style={styles.infoText}>Peso: {details?.weight / 10} kg</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, isFavorite ? styles.btnRemove : styles.btnAdd]}
        onPress={() =>
          navigation.navigate('FavoriteModal', {
            item: { id: id.toString(), name: details?.name },
            isFavorite,
          })
        }
      >
        <Text style={styles.btnText}>
          {isFavorite ? '★ Opções de Favorito (Remover)' : '☆ Favoritar Pokémon'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
        <Text style={styles.btnBackText}>← Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------------------------------------------
// 3. TELA: FAVORITEMODALSCREEN (Modal com AsyncStorage)
// ----------------------------------------------------
function FavoriteModalScreen({ route, navigation }) {
  const { item, isFavorite } = route.params;

  const handleSaveToggle = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem('@favorites_pokemon');
      let favorites = storedFavs ? JSON.parse(storedFavs) : [];

      if (isFavorite) {
        favorites = favorites.filter((fav) => fav.id !== item.id);
      } else {
        favorites.push(item);
      }

      await AsyncStorage.setItem('@favorites_pokemon', JSON.stringify(favorites));
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {isFavorite ? 'Remover dos Favoritos?' : 'Adicionar aos Favoritos?'}
        </Text>
        <Text style={styles.modalSubtitle}>
          Deseja {isFavorite ? 'remover' : 'salvar'}{' '}
          <Text style={styles.bold}>{item.name.toUpperCase()}</Text> na sua lista?
        </Text>

        <TouchableOpacity
          style={[styles.btn, isFavorite ? styles.btnRemove : styles.btnAdd]}
          onPress={handleSaveToggle}
        >
          <Text style={styles.btnText}>
            {isFavorite ? 'Confirmar Remoção' : 'Confirmar Adição'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnCancel} onPress={() => navigation.goBack()}>
          <Text style={styles.btnCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ----------------------------------------------------
// 4. TELA: FAVORITESSCREEN (Aba de Favoritos)
// ----------------------------------------------------
function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem('@favorites_pokemon');
      setFavorites(storedFavs ? JSON.parse(storedFavs) : []);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhum Pokémon favoritado ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardContainer}
              onPress={() => {
                navigation.navigate('InicioStack', {
                  screen: 'Detalhes',
                  params: { id: item.id, name: item.name },
                });
              }}
            >
              <Image
                source={{
                  uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.id}.png`,
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{item.name.toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ----------------------------------------------------
// 5. NAVEGAÇÃO E ESTRUTURA DAS ROTAS
// ----------------------------------------------------
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Lista" component={HomeScreen} options={{ title: 'Pokédex' }} />
      <Stack.Screen name="Detalhes" component={DetailScreen} options={{ title: 'Detalhes' }} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="InicioStack" component={HomeStack} options={{ title: 'Pokémon' }} />
      <Tab.Screen
        name="Favoritos"
        component={FavoritesScreen}
        options={{ headerShown: true, title: 'Meus Favoritos' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="FavoriteModal"
          component={FavoriteModalScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ----------------------------------------------------
// 6. ESTILOS
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#EE1515', textAlign: 'center', marginBottom: 15 },
  button: { backgroundColor: '#EE1515', padding: 10, borderRadius: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 16 },
  cardContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8,
    padding: 10,
    elevation: 2,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, marginRight: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  pushBtn: { backgroundColor: '#e0e0e0', padding: 8, borderRadius: 5 },
  pushBtnText: { fontSize: 10, color: '#333' },
  detailContainer: { padding: 20, alignItems: 'center', backgroundColor: '#fff', flexGrow: 1 },
  image: { width: 200, height: 200 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 10, color: '#222' },
  badgeContainer: { flexDirection: 'row', marginBottom: 15 },
  badge: { backgroundColor: '#2a75bb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginHorizontal: 4 },
  badgeText: { color: '#fff', fontWeight: 'bold', textTransform: 'capitalize' },
  infoBox: { width: '100%', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 20 },
  infoText: { fontSize: 16, color: '#444', marginBottom: 5 },
  btn: { width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnAdd: { backgroundColor: '#ffcb05' },
  btnRemove: { backgroundColor: '#ff4d4d' },
  btnText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  btnBack: { marginTop: 10 },
  btnBackText: { color: '#666', fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  bold: { fontWeight: 'bold', color: '#000' },
  btnCancel: { padding: 10 },
  btnCancelText: { color: '#666' },
});