WITH row,
     CASE
       WHEN row.uuid IS NULL OR row.uuid = '' THEN apoc.create.uuid()
       ELSE row.uuid
     END AS generatedUuid
MERGE (p:Person { name: row.name })
ON CREATE SET
  p.uuid = generatedUuid,
  p.gender = row.gender,
  p.birthDate = row.birthDate,
  p.nationality = row.nationality,
  p.profileImage = row.profileImage,
  p.primaryRole = row.primaryRole,
  p.roles = row.roles,
  p.sport = row.sport
RETURN p;
