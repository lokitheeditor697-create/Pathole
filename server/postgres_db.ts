import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

class PostgresManager {
  private pool: Pool | null = null;
  private isConnected = false;
  private connectionError: string | null = null;
  private lastPing: string | null = null;

  constructor() {
    this.init();
  }

  public async init() {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.PG_CONNECTION_STRING ||
      `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'municipal_road_db'}`;

    try {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 2500,
        idleTimeoutMillis: 10000,
        max: 10
      });

      // Test connection
      const client = await this.pool.connect();
      const res = await client.query('SELECT NOW() as current_time, version() as pg_version;');
      client.release();

      this.isConnected = true;
      this.connectionError = null;
      this.lastPing = new Date().toISOString();
      console.log(`[PostgreSQL] Successfully connected to PostgreSQL database:`, res.rows[0]?.current_time);

      await this.initializeSchema();
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message || 'Unable to connect to PostgreSQL server';
      console.info(`[PostgreSQL] Running with dual-mode storage. PostgreSQL connection status: ${this.connectionError}. In-memory & JSON file ACID storage active.`);
    }
  }

  private async initializeSchema() {
    if (!this.pool || !this.isConnected) return;
    try {
      const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(sql);
        console.log('[PostgreSQL] PostgreSQL & PostGIS tables verified and initialized.');
      }
    } catch (e: any) {
      console.warn('[PostgreSQL] Schema initialization warning (PostGIS or tables):', e.message);
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      engine: 'PostgreSQL / PostGIS',
      database_url: process.env.DATABASE_URL ? '[Configured]' : '[Not Configured — using built-in JSON storage]',
      error: this.connectionError ? 'Connection unavailable (built-in storage active)' : null,
      last_ping: this.lastPing,
      dual_mode_active: true
    };
  }

  public async query(text: string, params?: any[]): Promise<QueryResult<any> | null> {
    if (!this.pool || !this.isConnected) return null;
    try {
      return await this.pool.query(text, params);
    } catch (e: any) {
      console.warn('[PostgreSQL Query Error]:', e.message);
      return null;
    }
  }

  public async syncDefect(defect: any) {
    if (!this.isConnected) return;
    try {
      const q = `
        INSERT INTO defects (
          detection_id, pothole_id, defect_type, class_name,
          latitude, longitude, geom, severity, confidence,
          road_id, segment_id, exact_chainage_m, bus_count,
          bus_ids, reporting_vehicles, total_detections,
          is_multi_bus_verified, bbox, snapshot_thumbnail,
          status, source, first_detected, last_detected, model_version
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22, $23
        )
        ON CONFLICT (detection_id) DO UPDATE SET
          bus_count = EXCLUDED.bus_count,
          bus_ids = EXCLUDED.bus_ids,
          reporting_vehicles = EXCLUDED.reporting_vehicles,
          total_detections = EXCLUDED.total_detections,
          is_multi_bus_verified = EXCLUDED.is_multi_bus_verified,
          last_detected = EXCLUDED.last_detected,
          severity = EXCLUDED.severity,
          confidence = EXCLUDED.confidence;
      `;
      await this.query(q, [
        defect.detection_id,
        defect.pothole_id || null,
        defect.defect_type || defect.class_name,
        defect.class_name,
        defect.latitude,
        defect.longitude,
        defect.severity,
        defect.confidence,
        defect.road_id,
        defect.segment_id,
        defect.exact_chainage_m,
        defect.bus_count || 1,
        defect.bus_ids || 'MTC 46G',
        JSON.stringify(defect.reporting_vehicles || []),
        defect.total_detections || 1,
        defect.is_multi_bus_verified || false,
        JSON.stringify(defect.bbox || {}),
        defect.snapshot_thumbnail || null,
        defect.status || 'Open',
        defect.source || 'transit_bus',
        defect.first_detected || new Date().toISOString(),
        defect.last_detected || new Date().toISOString(),
        defect.model_version || 'YOLOv8-road-v1'
      ]);
    } catch (e: any) {
      console.warn('[PostgreSQL syncDefect Error]:', e.message);
    }
  }

  public async syncCase(c: any) {
    if (!this.isConnected) return;
    try {
      const q = `
        INSERT INTO defect_cases (
          case_id, pothole_id, defect_id, detection_id, defect_type,
          class_name, road_id, road_name, segment_id, exact_chainage_m,
          latitude, longitude, geom, severity, priority,
          status, assigned_contractor, assigned_team, assigned_person,
          target_completion_date, created_at, reported_at,
          acknowledged_at, assigned_at, work_started_at,
          repair_completed_at, verified_at, closed_at,
          before_evidence, after_evidence, recurrence_count,
          previous_case_ids, deterioration_detected, verified_repaired_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, ST_SetSRID(ST_MakePoint($12, $11), 4326), $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24,
          $25, $26, $27,
          $28, $29, $30,
          $31, $32, $33
        )
        ON CONFLICT (case_id) DO UPDATE SET
          status = EXCLUDED.status,
          severity = EXCLUDED.severity,
          priority = EXCLUDED.priority,
          after_evidence = EXCLUDED.after_evidence,
          verified_at = EXCLUDED.verified_at,
          closed_at = EXCLUDED.closed_at,
          deterioration_detected = EXCLUDED.deterioration_detected,
          verified_repaired_at = EXCLUDED.verified_repaired_at;
      `;
      await this.query(q, [
        c.case_id,
        c.pothole_id || null,
        c.defect_id || null,
        c.detection_id || null,
        c.defect_type,
        c.class_name,
        c.road_id,
        c.road_name,
        c.segment_id,
        c.exact_chainage_m,
        c.latitude,
        c.longitude,
        c.severity,
        c.priority,
        c.status,
        c.assigned_contractor || null,
        c.assigned_team || null,
        c.assigned_person || null,
        c.target_completion_date || null,
        c.created_at,
        c.reported_at || null,
        c.acknowledged_at || null,
        c.assigned_at || null,
        c.work_started_at || null,
        c.repair_completed_at || null,
        c.verified_at || null,
        c.closed_at || null,
        JSON.stringify(c.before_evidence || {}),
        JSON.stringify(c.after_evidence || {}),
        c.recurrence_count || 0,
        JSON.stringify(c.previous_case_ids || []),
        c.deterioration_detected || false,
        c.verified_repaired_at || null
      ]);
    } catch (e: any) {
      console.warn('[PostgreSQL syncCase Error]:', e.message);
    }
  }

  public async syncObservation(obs: any) {
    if (!this.isConnected) return;
    try {
      const q = `
        INSERT INTO defect_observations (
          observation_id, case_id, pothole_id, observation_number,
          vehicle_id, timestamp, latitude, longitude, geom,
          exact_chainage_m, severity, confidence, width_cm,
          length_cm, area_sq_cm, deterioration_notes, snapshot_thumbnail
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($8, $7), 4326),
          $9, $10, $11, $12,
          $13, $14, $15, $16
        )
        ON CONFLICT (observation_id) DO NOTHING;
      `;
      await this.query(q, [
        obs.observation_id,
        obs.case_id,
        obs.pothole_id || null,
        obs.observation_number,
        obs.vehicle_id,
        obs.timestamp,
        obs.latitude,
        obs.longitude,
        obs.exact_chainage_m,
        obs.severity,
        obs.confidence,
        obs.width_cm,
        obs.length_cm,
        (obs.width_cm || 0) * (obs.length_cm || 0),
        obs.deterioration_notes || null,
        obs.snapshot_thumbnail || null
      ]);
    } catch (e: any) {
      console.warn('[PostgreSQL syncObservation Error]:', e.message);
    }
  }
}

export const postgresDB = new PostgresManager();
