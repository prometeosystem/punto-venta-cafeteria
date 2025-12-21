import { useState } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'

const PuntoVenta = () => {
  const [cart, setCart] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})

  const products = [
    { id: 1, name: 'Café Americano', price: 15, category: 'Bebidas Calientes' },
    { id: 2, name: 'Cappuccino', price: 20, category: 'Bebidas Calientes' },
    { id: 3, name: 'Latte', price: 20, category: 'Bebidas Calientes' },
    { id: 4, name: 'Matcha Latte', price: 25, category: 'Bebidas Calientes' },
    { id: 5, name: 'Croissant', price: 18, category: 'Panadería' },
    { id: 6, name: 'Muffin de Arándanos', price: 22, category: 'Panadería' },
    { id: 7, name: 'Té Verde', price: 15, category: 'Bebidas Calientes' },
    { id: 8, name: 'Smoothie de Fresa', price: 28, category: 'Bebidas Frías' },
  ]

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const categories = [...new Set(products.map(p => p.category))]

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // Todas las categorías colapsadas por defecto
  const isCategoryExpanded = (category) => {
    return expandedCategories[category] === true
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <p className="text-gray-600 mt-1">Gestiona las ventas de tu cafetería</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos */}
        <div className="lg:col-span-2 space-y-4">
          {categories.map(category => {
            const isExpanded = isCategoryExpanded(category)
            const categoryProducts = products.filter(p => p.category === category)
            
            return (
              <div key={category} className="card">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-lg font-semibold text-gray-900">
                    {category}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {categoryProducts.length} productos
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {categoryProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-matcha-500 hover:bg-matcha-50 transition-all duration-200 text-left"
                      >
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-matcha-600 font-semibold mt-1">
                          ${product.price.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Carrito */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-matcha-600" />
              <h2 className="text-lg font-semibold text-gray-900">Carrito</h2>
              {cart.length > 0 && (
                <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${item.price.toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-medium text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded hover:bg-red-100 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-matcha-600">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <button className="btn-primary w-full py-3 text-lg">
                    Procesar Venta
                  </button>
                  <button
                    onClick={() => setCart([])}
                    className="btn-outline w-full py-2"
                  >
                    Limpiar Carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PuntoVenta

