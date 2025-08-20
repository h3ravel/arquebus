class Migration {
    connection
    withinTransaction = true
    getConnection() {
        return this.connection
    }
}
export default Migration
