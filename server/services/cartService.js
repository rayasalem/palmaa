/**
 * Cart service: per-user cart and cart_items in DB.
 * Tables: carts (user_id unique), cart_items (cart_id, product_id, quantity, price).
 */

import { supabase } from '../config/supabaseClient.js';

const CARTS_TABLE = 'carts';
const CART_ITEMS_TABLE = 'cart_items';
const PRODUCTS_TABLE = 'products';

async function getOrCreateCart(userId) {
  const { data: existing, error: findErr } = await supabase
    .from(CARTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (findErr) return { data: null, error: findErr };
  if (existing) return { data: existing, error: null };
  const now = new Date().toISOString();
  const { data: created, error: insertErr } = await supabase
    .from(CARTS_TABLE)
    .insert({ user_id: userId, created_at: now, updated_at: now })
    .select()
    .single();
  if (insertErr) return { data: null, error: insertErr };
  return { data: created, error: null };
}

async function getCartWithItems(userId) {
  const { data: cart, error: cartErr } = await getOrCreateCart(userId);
  if (cartErr || !cart) return { data: null, error: cartErr || new Error('Cart not found') };
  const { data: items, error: itemsErr } = await supabase
    .from(CART_ITEMS_TABLE)
    .select('id, product_id, quantity, price, created_at')
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: true });
  if (itemsErr) return { data: null, error: itemsErr };
  const itemsWithProduct = await Promise.all(
    (items || []).map(async (item) => {
      const { data: product } = await supabase
        .from(PRODUCTS_TABLE)
        .select('id, name, image_url, price_ils, condition')
        .eq('id', item.product_id)
        .single();
      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        created_at: item.created_at,
        product: product || undefined,
      };
    })
  );
  return {
    data: {
      id: cart.id,
      user_id: cart.user_id,
      items: itemsWithProduct,
      updated_at: cart.updated_at,
    },
    error: null,
  };
}

async function addItem(userId, productId, quantity) {
  if (!productId || quantity == null || quantity < 1) {
    return { data: null, error: { message: 'product_id and quantity (>= 1) required' } };
  }
  const qty = Math.max(1, Number(quantity));
  const { data: cart, error: cartErr } = await getOrCreateCart(userId);
  if (cartErr || !cart) return { data: null, error: cartErr || new Error('Cart not found') };
  const { data: product, error: productErr } = await supabase
    .from(PRODUCTS_TABLE)
    .select('id, price_ils, price')
    .eq('id', productId)
    .single();
  if (productErr || !product) return { data: null, error: { message: 'Product not found' } };
  const price = Number(product.price_ils ?? product.price ?? 0);
  const { data: existingItem } = await supabase
    .from(CART_ITEMS_TABLE)
    .select('id, quantity')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .maybeSingle();
  const now = new Date().toISOString();
  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    const { error: updateErr } = await supabase
      .from(CART_ITEMS_TABLE)
      .update({ quantity: newQty, price })
      .eq('id', existingItem.id);
    if (updateErr) return { data: null, error: updateErr };
  } else {
    const { error: insertErr } = await supabase
      .from(CART_ITEMS_TABLE)
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        price,
        created_at: now,
      });
    if (insertErr) return { data: null, error: insertErr };
  }
  await supabase.from(CARTS_TABLE).update({ updated_at: now }).eq('id', cart.id);
  return getCartWithItems(userId);
}

async function updateItem(userId, productId, quantity) {
  const { data: cart, error: cartErr } = await getOrCreateCart(userId);
  if (cartErr || !cart) return { data: null, error: cartErr || new Error('Cart not found') };
  const { data: item, error: findErr } = await supabase
    .from(CART_ITEMS_TABLE)
    .select('id')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .maybeSingle();
  if (findErr || !item) return { data: null, error: { message: 'Item not in cart' } };
  const qty = Number(quantity);
  if (qty <= 0) {
    await supabase.from(CART_ITEMS_TABLE).delete().eq('id', item.id);
  } else {
    const { error: updateErr } = await supabase
      .from(CART_ITEMS_TABLE)
      .update({ quantity: qty })
      .eq('id', item.id);
    if (updateErr) return { data: null, error: updateErr };
  }
  const now = new Date().toISOString();
  await supabase.from(CARTS_TABLE).update({ updated_at: now }).eq('id', cart.id);
  return getCartWithItems(userId);
}

async function removeItem(userId, productId) {
  const { data: cart, error: cartErr } = await getOrCreateCart(userId);
  if (cartErr || !cart) return { data: null, error: cartErr || new Error('Cart not found') };
  const { data: item } = await supabase
    .from(CART_ITEMS_TABLE)
    .select('id')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .maybeSingle();
  if (item) {
    await supabase.from(CART_ITEMS_TABLE).delete().eq('id', item.id);
    const now = new Date().toISOString();
    await supabase.from(CARTS_TABLE).update({ updated_at: now }).eq('id', cart.id);
  }
  return getCartWithItems(userId);
}

async function clearCart(userId) {
  const { data: cart, error: cartErr } = await getOrCreateCart(userId);
  if (cartErr || !cart) return { data: null, error: cartErr || new Error('Cart not found') };
  await supabase.from(CART_ITEMS_TABLE).delete().eq('cart_id', cart.id);
  const now = new Date().toISOString();
  await supabase.from(CARTS_TABLE).update({ updated_at: now }).eq('id', cart.id);
  return getCartWithItems(userId);
}

export {
  getOrCreateCart,
  getCartWithItems,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
