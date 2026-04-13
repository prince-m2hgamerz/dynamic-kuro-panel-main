-- Function to cleanup activations when key expires/revokes
CREATE OR REPLACE FUNCTION cleanup_expired_key_activations()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to expired or revoked, delete all activations
  IF NEW.status IN ('expired', 'revoked') AND 
     (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    DELETE FROM key_activations WHERE key_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on license_keys table
CREATE TRIGGER trigger_cleanup_expired_activations
  AFTER UPDATE ON license_keys
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_expired_key_activations();