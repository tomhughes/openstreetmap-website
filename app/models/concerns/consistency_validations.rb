module ConsistencyValidations
  extend ActiveSupport::Concern

  # Generic checks that are run for the updates and deletes of
  # node, ways and relations. This code is here to avoid duplication,
  # and allow the extension of the checks without having to modify the
  # code in 6 places for all the updates and deletes.
  # This will throw an exception if there is an inconsistency
  def check_update_element_consistency(old, new, user)
    if new.id != old.id || new.id.nil? || old.id.nil?
      raise OSM::APIPreconditionFailedError, "New and old IDs don't match on #{new.class}. #{new.id} != #{old.id}."
    elsif new.version != old.version
      raise OSM::APIVersionMismatchError.new(new.id, new.class.to_s, new.version, old.version)
    end

    check_changeset_consistency(new.changeset, user)
  end

  # This is similar to above, just some validations don't apply
  def check_create_element_consistency(new, user)
    check_changeset_consistency(new.changeset, user)
  end

  ##
  # subset of consistency checks which should be applied to almost
  # all the changeset controller's writable methods.
  def check_changeset_consistency(changeset, user)
    # check user credentials - only the user who opened a changeset
    # may alter it.
    if changeset.nil?
      raise OSM::APIChangesetMissingError
    elsif user.id != changeset.user_id
      raise OSM::APIUserChangesetMismatchError
    elsif !changeset.open?
      raise OSM::APIChangesetAlreadyClosedError, changeset
    end
  end
end
