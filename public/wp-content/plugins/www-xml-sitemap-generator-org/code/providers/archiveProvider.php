<?php

namespace xmlSitemapGenerator;

	class archiveProvider extends providerCore  implements iSitemapProvider
	{
		
		public $maxPageSize = -1;
		
		public function getSuppportedTypes()
		{
			$types = array( "archive");	
			
			return $types;
		}
		
		public function getPageCount($type)
		{
			if ($this->exclude()) {return 0;}
			return 1;

		}
			
		public function getPage($type,$page)
		{
			
			if ($this->exclude()) {return;}
			
			global $wpdb;

			$date = self::getDateField($this->sitemapDefaults->dateField);
				
			$sql = "SELECT DISTINCT YEAR(post_date) AS year,MONTH(post_date) AS month, 
						UNIX_TIMESTAMP(MAX(posts.{$date})) AS sitemapDate, 	Count(posts.ID) as posts
				FROM {$wpdb->posts} as posts
				WHERE post_status = 'publish' AND post_type = 'post' AND posts.post_password = ''
				GROUP BY YEAR(post_date), MONTH(post_date)
				ORDER BY YEAR(post_date) ,MONTH(post_date)";
	 

			$cmd = $wpdb->prepare($sql, $frontPageId, $type , $offset , $this->maxPageSize) ;

			$results = $wpdb->get_results($cmd);
			if ($results ) 
			{
				$this->doPopulate($results);
			}		
			return $this->urlsList;
			
		}	
		
		private function doPopulate($results)
		{
			
				foreach( $results as $result ) {
					
					$now = getdate();
				
					if($result->month == date("n") && $result->year == date("Y"))
					{
						$defaults = $this->sitemapDefaults->recentArchive;	
					}
					else
					{
						$defaults = $this->sitemapDefaults->oldArchive;
					}
			 
					$exlcude =   $defaults->exclude  ;
					$posts = $result->posts;
					
					$pageUrl = get_month_link( $result->year , $result->month) ;
				
					
					if ($exlcude != 2)
					{	
							
						if ($this->isIncluded($pageUrl,$this->sitemapDefaults->excludeRules ))
						{
							
							$url = new mapItem();
							$url->location = $pageUrl;		
							$url->title = date('F', strtotime("2012-$result->month-01")) . " | " . $result->year ;
							$url->description = "";
							$url->modified  =  $result->sitemapDate ;
							$url->priority =     $defaults->priority  ;	
							$url->frequency  =  $defaults->frequency ;					
							
							$this->addUrls($result->posts, $url);
						 
						}
					}
					
				}
		}

		private function  exclude()
		{
			
			$defaults1 = $this->sitemapDefaults->recentArchive;	
			$defaults2 = $this->sitemapDefaults->oldArchive;
			
			if ($this->isExcluded($defaults1->exclude) && $this->isExcluded($defaults2->exclude) ) {return true;}
			return false;
		}


	}




?>