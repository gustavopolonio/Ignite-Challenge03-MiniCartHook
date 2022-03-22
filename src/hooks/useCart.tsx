import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Check if product is already in Cart
      const isInCart = cart.find(product => product.id === productId)
      if (isInCart) { // Product is in the Cart
        const amountInStock = await api.get<Stock>(`stock/${productId}`)
          .then(response => response.data.amount)

        const amountInCart = isInCart.amount

        if (amountInCart < amountInStock) {
          const newCart = cart.map(product => {
            if (product.id !== productId) {
              return product
            } else {
              return {
                ...product,
                amount: product.amount + 1
              }
            }
          })

          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      } else { // Product isnt in the Cart
        const productAdded = await api.get<Product>(`products/${productId}`)
          .then(response => ({
            ...response.data,
            amount: 1
          }))
        
        const cartAdded = [
          ...cart,
          productAdded
        ]
        
        setCart(cartAdded)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAdded))
      }
      
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const testError = cart.findIndex(product => product.id === productId)
      if (testError === -1) {
        throw Error()
      }

      const cartAdded = cart.filter(product => product.id !== productId)
      setCart(cartAdded)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAdded))

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const amountInStock = await api.get<Stock>(`stock/${productId}`)
        .then(response => response.data.amount)

      if (amount > amountInStock) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        const cartAdded = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount
            }
          } else {
            return product
          }
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAdded))
        setCart(cartAdded)
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
