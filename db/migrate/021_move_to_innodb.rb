class MoveToInnodb < ActiveRecord::Migration[4.2]
  @conv_tables = %w[nodes ways way_tags way_nodes current_way_tags relation_members relations relation_tags current_relation_tags]

  @ver_tbl = %w[nodes ways relations]

  def self.up
    remove_index :current_way_tags, :name => :current_way_tags_v_idx
    remove_index :current_relation_tags, :name => :current_relation_tags_v_idx

    @ver_tbl.each do |tbl|
      change_column tbl, "version", :bigint, :null => false
      add_column "current_#{tbl}", "version", :bigint, :null => false
      # As the initial version of all nodes, ways and relations is 0, we set tehe
      # current version to something less so that we can update the version in
      # batches of 10000
      tbl.classify.constantize.update_all(:version => -1)
      tbl.classify.constantize.update_all("version=(SELECT max(version) FROM #{tbl} WHERE #{tbl}.id = current_#{tbl}.id)", { :version => -1 }, { :limit => 10000 }) while tbl.classify.constantize.where(:version => -1).any?
      # execute "UPDATE current_#{tbl} SET version = " +
      #  "(SELECT max(version) FROM #{tbl} WHERE #{tbl}.id = current_#{tbl}.id)"
      # The above update causes a MySQL error:
      # -- add_column("current_nodes", "version", :bigint, {:null=>false, :limit=>20})
      # -> 1410.9152s
      # -- execute("UPDATE current_nodes SET version = (SELECT max(version) FROM nodes WHERE nodes.id = current_nodes.id)")
      # rake aborted!
      # Mysql::Error: The total number of locks exceeds the lock table size: UPDATE current_nodes SET version = (SELECT max(version) FROM nodes WHERE nodes.id = current_nodes.id)

      # The above rails version will take longer, however will no run out of locks
    end
  end

  def self.down
    raise ActiveRecord::IrreversibleMigration
  end
end
