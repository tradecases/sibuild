-- Function to update supplier balance
CREATE OR REPLACE FUNCTION update_supplier_balance(
  p_supplier_id UUID,
  p_amount NUMERIC
)
RETURNS void AS $$
BEGIN
  UPDATE suppliers
  SET outstanding_balance = outstanding_balance + p_amount,
      total_purchases = total_purchases + p_amount
  WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;